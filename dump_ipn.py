import logging
import time
import csv
import os
import webapp2

import StringIO

import PaypalIPN

from google.appengine.ext import db
from google.appengine.ext.webapp.util import run_wsgi_app


class Error(Exception):
  pass

class DumpIPNs(webapp2.RequestHandler):
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

app = webapp2.WSGIApplication(
  [('/dump-ipn', DumpIPNs)])

