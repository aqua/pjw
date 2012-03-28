import logging
import time
import csv
import os

import StringIO

import PaypalIPN

from google.appengine.dist import use_library
use_library('django', '1.2')
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.template import Context, Template


class Error(Exception):
  pass

class DumpIPNs(webapp.RequestHandler):
  def get(self):
    return self.post()

  def post(self):
    self.response.headers['Content-Type'] = 'text/html'
    sandboxed = bool(self.request.get('sandbox', False))
    ipns = db.GqlQuery('SELECT * from PaypalIPN')
    path = os.path.join(os.path.dirname(__file__), 'templates', 'ipn-list.html')
    self.response.out.write(template.render(path,
      Context({'L': [i.Templatify() for i in ipns]})))

def main():
  application = webapp.WSGIApplication(
    [('/get-payments', DumpIPNs)])
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
