Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '' },
    text: { type: String, value: '' }
  },

  methods: {
    onClose: function () {
      this.triggerEvent('close');
    },
    onStop: function () {}
  }
});
