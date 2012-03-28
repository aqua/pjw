
from google.appengine.ext import db

class PaypalIPN(db.Model):
  sandboxed = db.BooleanProperty(default=False)
  field_names = db.StringListProperty()
  field_values = db.StringListProperty()

  def Templatify(self):
    d = dict(zip(self.field_names, self.field_values))
    d['key'] = self.key()
    return d
