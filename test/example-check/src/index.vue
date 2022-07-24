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
 * 过后打扫房间了
 */

// 您好233 fsafsaf你好3

const message = "您好aa";

/**
 * 12312afsa你好22
 */

export default {
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
