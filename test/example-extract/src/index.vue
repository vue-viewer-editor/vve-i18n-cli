<template>
  <div>
    <p>测试文字</p>
    <!-- 希望先学习 2dd-->
  </div>
</template>
<script>
/**
 * 多行注释1
 */

// 单行注释

/**
 * 多行注释2
 */

// vve-i18n-zh-extract-disable-next-line
const message4 = "下一行禁止提取"

/* vve-i18n-zh-extract-disable */
 const message5 = "包裹禁止提取" // 测试啦啦啦
/* vve-i18n-zh-extract-enable */

export default {
  props: {
    type: {
      default: '我是属性'
    }
  },
  data () {
    return {
      title: this.$t('您好')
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
