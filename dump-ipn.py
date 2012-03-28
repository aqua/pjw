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


class Error(Exception):
  pass

class DumpIPNs(webapp.RequestHandler):
  def get(self):
    return self.post()

  def post(self):
    self.response.headers['Content-Type'] = 'text/plain'
    key = self.request.get('key')
    ipn = db.get(key)
    if not ipn:
      self.response.out.write('No such IPN: %s', key)
      return
    d = ipn.Templatify()
    self.response.out.write('IPN %s (%s)\n' % (key, d.get('txn_id')))
    for k, v in d.iteritems():
      self.response.out.write('%s = %s\n' % (k, v))

def main():
  application = webapp.WSGIApplication(
    [('/dump-ipn', DumpIPNs)])
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
