if (typeof Sky === "undefined") Sky = {};

(function () {
  var pending_invalidate = [];
  var next_id = 1;

  var Context = function () {
    this.callbacks = [];
    this.invalidated = false;
    this.id = next_id++;
  };
  Context.current = null;

  _.extend(Context.prototype, {
    run: function (f) {
      var previous = Context.current;
      Context.current = this;
      try { var ret = f(); }
      finally { Context.current = previous; }
      return ret;
    },

    // we specifically guarantee that this doesn't call any
    // invalidation functions (before returning) -- it just marks the
    // context as invalidated.
    invalidate: function () {
      if (!this.invalidated) {
        this.invalidated = true;
        if (!pending_invalidate.length)
          setTimeout(Sky.flush, 0);
        pending_invalidate.push(this);
      }
    },

    on_invalidate: function (f) {
      if (this.invalidated)
        // XXX should probably defer to flush
        f();
      else
        this.callbacks.push(f);
    },

    once: function (obj) {
      obj._once = obj._once || {};
      if (!(this.id in obj._once)) {
        obj._once[this.id] = true;
        this.on_invalidate(function () {
          delete obj._once[this.id];
        });
        return true;
      } else
        return false;
    }
  });

  _.extend(Sky, {
    flush: function () {
      var pending = pending_invalidate;
      pending_invalidate = [];

      _.each(pending, function (ctx) {
        _.each(ctx.callbacks, function (f) {
          f(); // XXX wrap in try?
        });
        delete this.callbacks; // maybe help the GC
      });
    },

    deps: {
      Context: Context
    }
  });
})();