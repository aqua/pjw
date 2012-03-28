import logging
import time

import PaypalIPN

from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app


class Error(Exception):
  pass

class AcceptIPN(webapp.RequestHandler):
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

class AcceptIPNSandbox(AcceptIPN):
  sandbox = True
  pass


def main():
  application = webapp.WSGIApplication(
    [('/accept-ipn-sandbox', AcceptIPNSandbox),
     ('/accept-ipn', AcceptIPN)])
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
