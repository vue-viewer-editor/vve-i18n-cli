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