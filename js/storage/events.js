var _events = {};

function on(event, fn) {
  (_events[event] = _events[event] || []).push(fn);
}

function off(event, fn) {
  if (!_events[event]) return;
  _events[event] = _events[event].filter(function(f) { return f !== fn; });
}

function emit(event, data) {
  var list = _events[event];
  if (list) {
    for (var i = 0; i < list.length; i++) {
      list[i](data);
    }
  }
}
