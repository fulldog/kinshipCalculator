Component({
  options: {
    multipleSlots: true
  },

  properties: {
    chips: { type: Array, value: [] }
  },

  methods: {
    onRemove: function (e) {
      var index = e.currentTarget.dataset.index;
      this.triggerEvent('remove', { index: index });
    },

    onUndo: function () {
      this.triggerEvent('undo', {});
    },

    onClear: function () {
      this.triggerEvent('clear', {});
    }
  }
});
