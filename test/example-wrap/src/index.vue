<template>
  <div>
    <p>{{$t('测试文字')}}</p>
    <a 
      :data="$t('您好')"
      :title="$t('希望的田野')" v-bind:href="cc" @click="handleClick" checked disabled
      data-ad='aaa'
      :target="cc">  {{$t('希望的的田野')}}   </a>
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
      return this.$t('世界')
    }
  }
}
</script>
