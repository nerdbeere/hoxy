/*
Written by Greg Reimer
Copyright (c) 2010
http://github.com/greim
*/

console.log('starting tests');

var proxyPort = 8080;
var HTTP = require('http');
var Rule = require('../lib/rules.js').Rule;
var RDB = require('../lib/rules-db.js');
var Q = require('../lib/asynch-queue.js');
var URL = require('url');
var HTS = require('../lib/http-transaction-state.js');
var ASSERT = require('assert');

// test the syntax
new Rule('request: if $hostname eq "", $.clear()');
new Rule('response:  if $port eq 80, $url.clear()');
new Rule('response: if	 $protocol matches /http/, $.clear');
new Rule('response:if $url eq "foo\\n", $.set-to("foo")');
new Rule('response: if$file not eq "bar", $.replace("foo","bar")');
new Rule('response:if$request-headers["blah"] eq "blah", $.replace(/foo/, "bar")');
new Rule('response: if $cookies["baz"]among["foo","bar","baz"], $.prepend("foo")');
new Rule('response: if $get-params["foo"] empty,$.append("bar")');
new Rule('response: if $post-params["bar"] empty	,  @js-beautify()');
new Rule('response: if $method contains "yay", @css-beautify');
new Rule('response: if $request-body starts-with "foo", @html-beautify()');
new Rule('response: if $origin ends-with "bar" or $response-headers["foo"] matches /foo/i, @wait(1000)	');
new Rule('response: if $content-type eq "" and $charset eq "", $origin.clear @unconditional');
new Rule('response: if $status eq "" or $ not eq "" and $ eq "", @js-beautify $.clear() ');
new Rule('	request:$hostname.append("")$origin.clear@dummy-load(1024)');

RDB.setRules([
	new Rule('request:@test("request")'),
	new Rule('response:@test("response")'),
	new Rule('request:$request-headers["bar"].set-to("")'),
	new Rule('request:if $request-headers["bar"] empty, @test("empty")'),
	new Rule('request:if $request-headers["foo"] empty, @test("undefEmpty")'),
	new Rule('request:if $hostname not empty, @test("notEmpty")'),
	new Rule('request:if $port eq 9596, @test("eq")'),
	new Rule('request:if $port eq "9596", @test("looseEq")'),
	new Rule('request:if $port not eq 90, @test("notEq")'),
	new Rule('request:if $request-headers["foo"] not eq "", @test("undefNotEqEmpty")'),
	new Rule('request:if $hostname contains "o", @test("contains")'),
	new Rule('request:if $hostname not contains "%", @test("notContains")'),
	new Rule('request:if $origin contains "http://example.com:80", @test("containsSelf")'),
	new Rule('request:if $origin starts-with "http://", @test("startsWith")'),
	new Rule('request:if $origin starts-with "http://example.com:80", @test("startsWithSelf")'),
	new Rule('request:if $origin not starts-with "xyz", @test("notStartsWith")'),
	new Rule('request:if $origin ends-with ":80", @test("endsWith")'),
	new Rule('request:if $origin ends-with "http://example.com:80", @test("endsWithSelf")'),
	new Rule('request:if $origin not ends-with "xyz", @test("notEndsWith")'),
	new Rule('request:if $origin matches /^HTTP/i, @test("matches")'),
	new Rule('request:if $origin not matches /^XHTTP/i, @test("notMatches")'),
	new Rule('request: $request-headers["bar"].set-to("foo")'),
	new Rule('request:if $request-headers["bar"] among ["foo","bar","baz"], @test("among")'),
	new Rule('request:if $request-headers["bar"] not among ["bux","bar","baz"], @test("notAmong")'),
	new Rule('request:if $request-headers["bar"] among ["foo"], @test("amongSelf")'),
	new Rule('request:if $request-headers["bar"] among ["foo","bar","baz"] and $ not among ["bux","bar","baz"], @test("and")'),
	new Rule('request:if $request-headers["bar"] among ["x","bar","baz"] or $ not empty, @test("or")'),
	new Rule('request:if $request-headers["bar"] empty and $ not empty or $ among ["foo"], @test("andOr")'),
	new Rule('request:if $hostname eq "localhost", @test("hostname")'),
	new Rule('request:if $port eq 9596, @test("port")'),
	new Rule('request:if $protocol eq "http:", @test("protocol")'),
	new Rule('request:if $url eq "/foo.html?bar=baz&bar%202=baz%202", @test("url")'),
	new Rule('request:if $file eq "foo.html", @test("file")'),
	new Rule('request:if $request-headers["host"] eq "localhost", @test("requestHeaders")'),
	new Rule('request:if $cookies["bar 3"] eq "baz 3", @test("cookies")'),
	new Rule('request:if $get-params["bar 2"] eq "baz 2", @test("getParams")'),
	new Rule('request:if $method eq "GET", @test("method")'),
	new Rule('request:if $origin eq "http://example.com:80", @test("origin")'),
	new Rule('response:if $response-headers["content-type"] eq "text/html; charset=utf-8", @test("responseHeaders")'),
	new Rule('response:if $content-type eq "text/html", @test("contentType")'),
	new Rule('response:if $charset eq "utf-8", @test("charset")'),
	new Rule('response:if $status eq 200, @test("status")'),
	new Rule('response:if $response-body eq "<html></html>", @test("responseBody")'),
	new Rule('request:if $post-params["a 5"] eq "a 6", @test("postParams")'),
	new Rule('request:if $request-body eq "a1=a2&a3=a4&a%205=a%206", @test("requestBody")'),
]);

var url = 'http://localhost:9596/foo.html?bar=baz&bar%202=baz%202';
var cookie = 'bar%204=baz%204; bar%203=baz%203';
var origin = 'http://example.com:80';
var contentType = 'text/html; charset=utf-8';
var responseBody = '<html></html>';
var requestBody = 'a1=a2&a3=a4&a%205=a%206';

var passes = {
	request:false,response:false,empty:false,undefEmpty:false,notEmpty:false,eq:false,
	looseEq:false,notEq:false,undefNotEqEmpty:false,contains:false,notContains:false,
	containsSelf:false,startsWith:false,startsWithSelf:false,notStartsWith:false,endsWith:false,
	endsWithSelf:false,notEndsWith:false,matches:false,notMatches:false,among:false,
	notAmong:false,amongSelf:false,and:false,or:false,andOr:false,hostname:false,
	port:false,protocol:false,url:false,file:false,requestHeaders:false,cookies:false,
	getParams:false,postParams:false,method:false,requestBody:false,origin:false,
	responseHeaders:false,contentType:false,charset:false,status:false,responseBody:false,
};

exports.run = function(api) {
	var testItem = api.arg(0);
	if (testItem === 'request' && !api.responseInfo) { passes['request'] = true; }
	else if (testItem === 'response' && api.responseInfo) { passes['response'] = true; }
	else if (testItem === 'start') {
		var cl = HTTP.createClient(8080, 'localhost');
		var getReq = cl.request('get', url, {'cookie':cookie,'origin':origin,'host':'localhost'});
		getReq.end();
		getReq.on('response',function(resp){
			resp.on('end',function(){
				var postReq = cl.request('post', url, {'cookie':cookie,'origin':origin,'host':'localhost'});
				postReq.end(requestBody);
					postReq.on('response',function(resp){
						resp.on('end',function(){
							Object.keys(passes)
							.forEach(function(key){
								ASSERT.ok(passes[key], 'expected '+key+' to pass');
							});
							console.log('all tests passed');
							process.exit();
						});
					});
			});
		});
		HTTP.createServer(function(req, resp){
			resp.writeHead(200, {'content-type':contentType});
			resp.end(responseBody);
		}).listen(9596);
	} else { passes[testItem] = true; }
	api.notify();
};