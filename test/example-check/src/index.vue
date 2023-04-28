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

const message2 = `引号`
/**
 * 12312afsa你好22
 */

const message3 = "您好2" // vve-i18n-zh-check-disable-line

// vve-i18n-zh-check-disable-next-line
const message4 = "您好3"

/* vve-i18n-zh-check-disable */
 const message5 = "您好4"
/* vve-i18n-zh-check-enable */

export default {
  props: {
    type: {
      default: '我是属性'
    }
  },
  data () {
    return {
      rules: [
        { 
          validator (rule, val, callback) {
            callback(new Error("请输入"))
          }
        }
      ],
      obj: {
        其他: 'aaa'
      },
      props: {
        title: '您好'
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