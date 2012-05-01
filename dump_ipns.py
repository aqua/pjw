import logging
import time
import csv
import os
import webapp2

import StringIO

import PaypalIPN

from google.appengine.dist import use_library
from google.appengine.ext import db
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.template import Context, Template


class Error(Exception):
  pass

class DumpIPNs(webapp2.RequestHandler):
  def get(self):
    return self.post()

  def post(self):
    self.response.headers['Content-Type'] = 'text/html'
    sandboxed = bool(self.request.get('sandbox', False))
    ipns = db.GqlQuery('SELECT * from PaypalIPN')
    path = os.path.join(os.path.dirname(__file__), 'templates', 'ipn-list.html')
    self.response.out.write(template.render(path,
      Context({'L': [i.Templatify() for i in ipns]})))

app = webapp2.WSGIApplication(
  [('/dump-ipns', DumpIPNs)])

