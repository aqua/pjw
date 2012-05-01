import logging
import time
import webapp2

import PaypalIPN

from google.appengine.ext import db
from google.appengine.ext.webapp.util import run_wsgi_app


class Error(Exception):
  pass

class AcceptIPN(webapp2.RequestHandler):
  sandbox = False
  def get(self):
    return self.post()

  def post(self):
    self.response.headers['Content-Type'] = 'text/plain'
    names, values = [], []
    for name in self.request.arguments():
      for value in self.request.get_all(name):
        logging.info('%s=%s', name, value)
        names.append(name)
        values.append(value or '')
    ipn = PaypalIPN.PaypalIPN(sandboxed=self.sandbox,
                              field_names=names, field_values=values)
    try:
      ipn.put()
    except db.TransactionFailedError, e:
      logging.error('Write to datastore failed: %s', str(e))
      logging.error('Object was: ', str(ipn))
      self.response.out.write('error')
      return
    self.response.out.write('ok')

app = webapp2.WSGIApplication([('/accept-ipn', AcceptIPN)])

#run_wsgi_app(application)
