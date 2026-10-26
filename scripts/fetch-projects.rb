#!/usr/bin/env ruby
# Pulls PROJECT.md (and the images it uses) from every bitbangbill repo tagged
# with the site topic, and writes it to _projects/remote/ for Jekyll to build.
# Run by .github/workflows/pages.yml before the Jekyll build; also runs locally.
#
# PROJECT.md is read from the `updates` branch, or the default branch if the
# repo has no `updates` branch. Front matter becomes the card and page details.
# Updates are "## YYYY-MM-DD — Title" sections anywhere in the body, or any
# "## Title" section under a "# Updates" heading. An update without a date gets
# the date and time of the commit that added its heading.

require "date"
require "erb"
require "fileutils"
require "json"
require "net/http"
require "open3"
require "tmpdir"
require "uri"
require "yaml"

OWNER    = ENV.fetch("SITE_OWNER", "bitbangbill")
TOPIC    = ENV.fetch("SITE_TOPIC", "bitbangbill-site")
BRANCH   = "updates"
FILE     = "PROJECT.md"
OUT_DIR  = "_projects/remote"
IMG_DIR  = "assets/img/projects"
STATUSES = {
  "planned" => "planned",
  "ongoing" => "ongoing", "in progress" => "ongoing",
  "complete" => "complete", "completed" => "complete", "done" => "complete",
  "across the line" => "complete"
}.freeze
DATED_HEADING  = /^##[ \t]+(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?[ \t]*(?:[—–:-][ \t]*)?(.*?)[ \t]*$/
PLAIN_HEADING  = /^##[ \t]+(.*?)[ \t#]*$/
UPDATES_TITLE  = /^#[ \t]+Updates[ \t#]*$/i

def warn_gh(msg)
  puts(ENV["GITHUB_ACTIONS"] ? "::warning::#{msg}" : "warning: #{msg}")
end

def get_json(url)
  uri = URI(url)
  req = Net::HTTP::Get.new(uri)
  req["Accept"] = "application/vnd.github+json"
  req["Authorization"] = "Bearer #{ENV["GITHUB_TOKEN"]}" if ENV["GITHUB_TOKEN"]
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }
  raise "GET #{url}: HTTP #{res.code}" unless res.is_a?(Net::HTTPSuccess)
  JSON.parse(res.body)
end

# Returns stdout, or nil if git fails.
def git(dir, *args)
  out, _err, status = Open3.capture3("git", "-C", dir, *args, binmode: true)
  status.success? ? out : nil
end

def relative?(src)
  src && !src.empty? && src !~ %r{\A([a-z][a-z0-9+.-]*:|/|#)}i
end

def clean_path(src)
  path = src.sub(/\A<(.*)>\z/, '\1').split(/[?#]/).first.to_s.sub(%r{\A\./}, "")
  path.split("/").include?("..") ? nil : path
end

class Project
  def initialize(repo, dir)
    @repo = repo
    @dir  = dir
    @name = repo["name"].downcase
    @full = repo["full_name"]
  end

  attr_reader :name

  # Clones without file contents; git fetches only the files read below.
  def fetch
    url = "https://github.com/#{@full}.git"
    clone = %w[clone -q --filter=blob:none --no-checkout --single-branch]
    @branch = BRANCH
    unless git(".", *clone, "--branch", BRANCH, url, @dir)
      @branch = @repo["default_branch"]
      git(".", *clone, "--branch", @branch, url, @dir) or raise "could not clone #{url}"
    end
    text = git(@dir, "show", "HEAD:#{FILE}")
    if text.nil?
      warn_gh("#{@full} has the #{TOPIC} topic but no #{FILE}; skipped")
      return false
    end
    parse(text.force_encoding("UTF-8").delete_prefix("﻿").gsub("\r\n", "\n"))
    true
  end

  def parse(text)
    m = text.match(/\A---[ \t]*\n(.*?\n)?---[ \t]*(\n|\z)/m)
    @meta = m ? YAML.safe_load(m[1].to_s, permitted_classes: [Date]) : {}
    @meta = {} unless @meta.is_a?(Hash)
    offset = m ? m[0].count("\n") : 0

    overview = +""
    updates = []
    in_updates = fence = false
    (m ? m.post_match : text).lines.each_with_index do |line, i|
      fence = !fence if line.start_with?("```", "~~~")
      if !fence && line.match?(UPDATES_TITLE)
        in_updates = true
      elsif !fence && (h = line.match(DATED_HEADING))
        updates << { line: offset + i + 1, date: h[1], time: h[2], title: h[3], text: +"" }
      elsif !fence && in_updates && (h = line.match(PLAIN_HEADING))
        updates << { line: offset + i + 1, title: h[1], text: +"" }
      elsif updates.empty?
        overview << line
      else
        updates.last[:text] << line
      end
    end

    @overview = overview.strip
    @updates = updates.filter_map { |u| finish_update(u) }
                      .sort_by { |u| [u["date"], u["time"].to_s] }.reverse
  end

  def finish_update(u)
    if u[:date]
      date = Date.iso8601(u[:date])
      time = u[:time]&.rjust(5, "0")
    else
      at = commit_times[u[:line] - 1]
      if at.nil?
        warn_gh("#{@full}: no commit found for update '#{u[:title]}'; dated today")
        at = Time.now
      end
      date, time = at.to_date, at.strftime("%H:%M")
    end
    update = { "date" => date }
    update["time"] = time if time
    update["title"] = u[:title].empty? ? "Update" : u[:title]
    update["text"] = localize_body(u[:text].strip)
    update
  rescue Date::Error
    warn_gh("#{@full}: bad update date '#{u[:date]}'; that update was skipped")
    nil
  end

  # Commit time of each line of PROJECT.md, in the committer's time zone.
  # -M keeps the original commit when sections are moved around the file.
  def commit_times
    @commit_times ||= begin
      times = []
      at = nil
      git(@dir, "blame", "-M", "--line-porcelain", "HEAD", "--", FILE).to_s.force_encoding("UTF-8").each_line do |l|
        if l.start_with?("committer-time ") then at = Time.at(l.split[1].to_i)
        elsif l.start_with?("committer-tz ") then at = at.getlocal("#{l.split[1][0, 3]}:#{l.split[1][3, 2]}")
        elsif l.start_with?("\t") then times << at
        end
      end
      times
    end
  end

  # Copies a repo-relative image into the site; returns its site path.
  def localize(src)
    return src unless relative?(src)
    path = clean_path(src) or return src
    dest = File.join(IMG_DIR, @name, path)
    unless File.exist?(dest)
      data = git(@dir, "show", "HEAD:#{path}")
      if data.nil?
        warn_gh("#{@full}: image #{path} not found on #{@branch}")
        return src
      end
      FileUtils.mkdir_p(File.dirname(dest))
      File.binwrite(dest, data)
    end
    dest.split("/").map { |s| ERB::Util.url_encode(s) }.join("/")
  end

  def image_url(src)
    local = localize(src)
    local == src ? src : "/#{local}"
  end

  # Images are copied into the site; other relative links point at GitHub.
  def localize_body(md)
    md.gsub(/(!\[[^\]]*\]\()(<[^>]+>|[^)\s]+)/) { "#{$1}#{image_url($2)}" }
      .gsub(/(<img\b[^>]*?\bsrc=["'])([^"']+)/i) { "#{$1}#{image_url($2)}" }
      .gsub(/((?<!!)\[[^\]]*\]\()(<[^>]+>|[^)\s]+)/) do
        pre, src = $1, $2
        path = relative?(src) && clean_path(src)
        path ? "#{pre}https://github.com/#{@full}/blob/#{@branch}/#{path}" : "#{pre}#{src}"
      end
  end

  def front_matter
    meta = @meta.dup
    meta["title"] ||= @repo["name"].tr("-_", " ").capitalize
    meta["summary"] ||= @repo["description"].to_s
    meta["repo"] ||= @full
    meta["date"] ||= @updates.first&.fetch("date")&.dup || Date.iso8601(@repo["pushed_at"][0, 10])

    status = STATUSES[meta["status"].to_s.strip.downcase]
    warn_gh("#{@full}: unknown status '#{meta["status"]}'; use planned, ongoing or complete") if meta["status"] && !status
    meta.delete("status")
    meta["status"] = status if status

    if meta["thumb"] && !File.exist?(File.join("_includes/thumbs", meta["thumb"].to_s))
      warn_gh("#{@full}: thumb '#{meta["thumb"]}' is not in _includes/thumbs/; use image: for a repo file")
      meta.delete("thumb")
    end
    meta["image"] = localize(meta["image"]) if meta["image"]
    Array(meta["gallery"]).each { |g| g["src"] = localize(g["src"]) if g.is_a?(Hash) }
    meta["updates"] = @updates unless @updates.empty?
    meta
  end

  def write
    overview = localize_body(@overview)
    File.write(File.join(OUT_DIR, "#{@name}.md"),
               "#{front_matter.to_yaml}---\n\n{% raw %}\n#{overview}\n{% endraw %}\n")
  end
end

FileUtils.rm_rf([OUT_DIR, IMG_DIR])
FileUtils.mkdir_p(OUT_DIR)

repos = (1..).lazy
             .map { |page| get_json("https://api.github.com/users/#{OWNER}/repos?per_page=100&page=#{page}") }
             .take_while { |batch| !batch.empty? }
             .flat_map(&:itself).to_a
tagged = repos.select { |r| Array(r["topics"]).include?(TOPIC) }
puts "#{tagged.size} repo(s) tagged #{TOPIC}"

tagged.each do |repo|
  Dir.mktmpdir do |tmp|
    project = Project.new(repo, File.join(tmp, "repo"))
    next unless project.fetch

    local = File.join("_projects", "#{project.name}.md")
    if File.exist?(local)
      # Both would build to the same URL; the repo's PROJECT.md wins.
      warn_gh("#{local} is replaced by #{repo["full_name"]}/#{FILE}")
      File.delete(local) if ENV["GITHUB_ACTIONS"]
    end
    project.write
    puts "  #{repo["full_name"]}"
  end
end
