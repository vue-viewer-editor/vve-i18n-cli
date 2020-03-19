export default {
  data () {
    return {
      i18n: this.$t ( '您好' ),
      hope: '希望',
      love: "你"
    }
  },
  mounted () {
    console.log('您好吗') // 您好
  },
  computed: {
    world () {
      return '世界'
    }
  }
}
