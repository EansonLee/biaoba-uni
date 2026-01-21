<script setup>
    import agreement from "@/sheep/api/dart/agreement";
    import {showToast} from "@/sheep/util/toast";

    const TermsOfService= async ()=>{
      await agreement.Api.findById(1)
          .then((res=>{
            showToast({
              title: res.title,
              message: res.content,
              isSticky: true
            });
          }))

    }

    onload(res=>{
      TermsOfService();
    })
</script>

<template>

</template>

<style scoped lang="scss">

</style>