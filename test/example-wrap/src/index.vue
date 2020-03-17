<template>
  <div>
    <p>{{$t("你好")}} {{world}}</p>
    <p title="希望的田野">希望的田野大大！</p>
    <p title="希望的田野"> 希望的田野 </p>
  </div>
</template>
<script>
export default {
  data () {
    return {
      hope: '希望',
      love: "你"
    }
  },
  computed: {
    world () {
      return '世界'
    }
  }
}
</script>
