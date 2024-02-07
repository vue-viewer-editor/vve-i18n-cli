<template>
  <div>
    <p>{{$t('测试文字')}}</p>
    <a 
      :data="$t('您好')"
      :title="$t('希望的田野')" v-bind:href="cc" @click="handleClick" checked disabled
      data-ad='aaa'
      :target="cc">  {{$t('希望的的田野')}}   </a>
    <a>{{love ? $t('爱') : $t('不爱')}}</a>
  </div>
</template>
<script>
/**
 * 您好
 吗
 过后打扫房间了
 */
export default {
  data () {
    return {
      hope: this.$t('希dd望'),
      i18n: this.$t ( '您好' ),
      love: this.$t("你") // 内容
    }
  },
  computed: {
    world () {
      // `中文${this.testDisabled}` 
      const backTick = this.$t('中文{0}', [this.testDisabled])

      let content = this.$t(
        '我换行了'
      )
      return this.$t('世界')
    },
    testDisabled () {
      var zh1 = '这一行不希望被包裹' // vve-i18n-zh-wrap-disable-line
      /* vve-i18n-zh-wrap-disable */
      var zh2 = '这一行也不希望被包裹'
      /* vve-i18n-zh-wrap-enable */

      // vve-i18n-zh-wrap-disable-next-line
      return '这一行还不希望被包裹'
    },
  }
}
</script>
