<template>
  <div>
    <p>测试文字</p>
  </div>
</template>
<script>
/**
 * 您好ccc
 * 吗
 * "过后打扫房间了"
 */

// 您好233 fsafsaf你好3

const message1 = "您好"

/* vve-i18n-zh-check-disable-next-line */
const message2 = `引号`
/* vve-i18n-zh-check-enabled */
/**
 * 12312afsa你好22
 */

export default {
  props: {
    type: {
      // vve-i18n-zh-check-disable-next-line
      default: '我是属性'
    }
  },
  data () {
    return {
      rules: [
        { 
          validator (rule, val, callback) {
            callback(new Error("请输入")) // vve-i18n-zh-check-disable-line
          }
        }
      ],
      obj: {
        其他: 'aaa'
      },
      props: {
        title: '您好' // vve-i18n-zh-check-disable-line
      }
    }
  },
  computed: {
  },
  methods: {
  },
  computed: {
  }
}
</script>