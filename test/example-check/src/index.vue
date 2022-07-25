<template>
  <div>
    <p>测试文字</p>
    <a 
      :data="$t('您好')"
      title="希望的田野" v-bind:href="cc" @click="handleClick" checked disabled
      data-ad='aaa'
      :target="cc">  希望的的田野   </a>
  </div>
</template>
<script>
/**
 * 您好ccc
 * 吗
 * "过后打扫房间了"
 */

// 您好233 fsafsaf你好3

const message = "您好aa";

const aa = `引号`

const aa2 = `引号${message}您好`

const aa3 = `引号${message}`

const aa3 = `ccc引号${message}好`

const aa4 = `ccc${message}`

const aa3 = `
您好22${message}
`

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
      hope: '希dd望',
      i18n: this.$t ( '您好' ),
      love: "你" // 内容
    }
  },
  computed: {
    world () {
      return '世界'
    }
  }
}
</script>
