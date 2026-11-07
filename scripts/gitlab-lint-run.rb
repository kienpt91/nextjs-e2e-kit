# Runs INSIDE the throwaway GitLab container (scripts/gitlab-lint.sh copies it there): creates an empty project, commits the pipeline file
# to its default branch and asks GitLab to lint it, once as a plain parse and once as a dry run of the pipeline for the default branch
# (which evaluates workflow:rules, extends and the other things GitLab only resolves when it builds a pipeline).
# usage: ruby gitlab-lint-run.rb TOKEN_FILE PIPELINE_FILE
require "json"
require "net/http"

token = File.read(ARGV.fetch(0)).strip
content = File.read(ARGV.fetch(1))

def call(token, verb, path, body = nil)
  uri = URI("http://localhost/api/v4#{path}")
  request = Net::HTTP.const_get(verb).new(uri, "PRIVATE-TOKEN" => token, "Content-Type" => "application/json")
  request.body = body.to_json if body
  response = Net::HTTP.start(uri.host, uri.port, read_timeout: 120) { |http| http.request(request) }
  [response.code.to_i, JSON.parse(response.body)]
end

code, project = call(token, "Post", "/projects", { name: "lint", path: "lint", default_branch: "main" })
abort "could not create the project (#{code}): #{project}" unless code == 201
id = project.fetch("id")
code, answer = call(token, "Post", "/projects/#{id}/repository/files/.gitlab-ci.yml", { branch: "main", content: content, commit_message: "Add the pipeline" })
abort "could not commit the file (#{code}): #{answer}" unless code == 201

ok = true
[["parse only", false], ["dry run of the pipeline for main", true]].each do |label, dry|
  code, result = call(token, "Post", "/projects/#{id}/ci/lint?dry_run=#{dry}&ref=main", { content: content, include_jobs: true })
  valid = code == 201 || code == 200 ? result["valid"] : false
  ok &&= valid == true
  puts "#{label}: #{valid ? 'valid' : 'INVALID'}"
  Array(result["errors"]).each { |e| puts "  error: #{e}" }
  Array(result["warnings"]).each { |w| puts "  warning: #{w}" }
  puts "  jobs: #{result['jobs'].map { |j| "#{j['name']} (#{j['stage']})" }.join(', ')}" if result["jobs"].is_a?(Array) && !result["jobs"].empty?
end
exit(ok ? 0 : 1)
