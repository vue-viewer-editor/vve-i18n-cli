<template>
  <div>
    <p 
      :data="$t('您好')"
      title="希望的田野" v-bind:href="cc" @click="handleClick" checked disabled
      data-ad='aaa'
      :target="cc">  希望的的田野   </p>
  </div>
</template>
<script>
export default {
  data () {
    return {
      hope: '希望',
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
