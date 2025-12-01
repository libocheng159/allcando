<template>
  <div class="fill-height d-flex flex-column py-4 pl-2" :style="xs || sm ? { width: '100%' } : { width: '92%' }">
    
    <v-row align="center" class="mt-2 mb-4">
      
      <v-col cols="12" md="8">
        <div class="px-2">
            <div 
                :style="xs||sm ? {'display':'none'} : {'font-size':'3.2rem', 'letter-spacing': '2px', 'line-height': '1.2'}" 
                class="lbc-left-welcome text-center mb-3"
                style="text-shadow: 0 4px 8px rgba(0,0,0,0.3); white-space: nowrap;"
            >
                {{ configdata.welcometitle }}
            </div>

            <v-text-field 
                class="search-bar-glass mx-auto"
                style="width: 100%; max-width: 800px;" 
                :style="xs||sm?{'display':'none'}:{}"
                v-model="searchQuery"
                placeholder="Search..."
                variant="solo" 
                rounded="pill"
                hide-details
                density="comfortable"
                @keyup.enter="performSearch"
                bg-color="rgba(255, 255, 255, 0.15)"
            >
                <template v-slot:prepend-inner>
                    <v-menu>
                        <template v-slot:activator="{ props }">
                        <v-btn variant="text" v-bind="props" class="engine-btn text-white" density="compact">
                            {{ selectedEngine.title }}
                            <v-icon icon="mdi-chevron-down" size="small" class="ml-1"></v-icon>
                        </v-btn>
                        </template>
                        <v-list class="glass-list">
                            <v-list-item v-for="engine in searchEngines" :key="engine.value" @click="selectedEngine = engine" density="compact">
                                {{ engine.title }}
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </template>

                <template v-slot:append-inner>
                    <v-btn :icon="isUrl ? 'mdi-earth' : 'mdi-magnify'" variant="text" color="white" @click="performSearch"></v-btn>
                </template>
            </v-text-field>
            
            <typewriter class="mt-3 d-flex align-center justify-center text-grey-lighten-2" style="min-height: 20px; font-size: 0.9rem;"></typewriter>
        </div>
      </v-col>

      <v-col cols="12" md="4" class="d-flex justify-end pr-md-16" style="align-self: center;">
          <div class="d-flex align-center" style="transform-origin: right center;">
                <div class="text-right mr-3">
                    <div class="clock-font text-white" style="font-size: 2.6rem; line-height: 1; text-shadow: 0 0 15px rgba(100,200,255,0.6); white-space: nowrap;">
                        {{formattedTime}}
                    </div>
                    <div class="text-uppercase text-caption font-weight-bold text-grey-lighten-1" style="letter-spacing: 2px; margin-top: 5px;">
                        {{formattedDate}}
                    </div>
                </div>
                <div style="transform: scale(0.75);">
                    <turntable :color1="configdata.color.turntablecolor1" :color2="configdata.color.turntablecolor2" />
                </div>
          </div>
      </v-col>
    </v-row>

    <div class="flex-grow-1">
        <v-row no-gutters class="mb-2">
            <v-col cols="12">
                <v-chip 
                    variant="text"
                    prepend-icon="mdi-webhook"  
                    size="large" 
                    class="font-weight-bold px-0 pl-3"
                    style="color: var(--lbc-vcard-color); font-size: 1.1rem;"
                >
                部署项目 / PROJECTS
                </v-chip>
            </v-col>
        </v-row>

        <v-row dense>
            <v-col
                v-for="(item,key) in projectcards" :key="key"
                cols="12"
                sm="6"
                md="4"
                lg="3" 
            >
                <v-card 
                    class="project-card fill-height ma-1"
                    hover
                    rounded="lg"
                    style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);"
                >
                    <v-img
                        aspect-ratio="1.7778"
                        :src= item.img
                        cover
                        class="align-end"
                        gradient="to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.8) 100%"
                    >
                        <v-card-title class="text-white text-subtitle-1 font-weight-bold pb-1 pl-3">
                            {{item.title}}
                        </v-card-title>
                    </v-img>

                    <v-card-subtitle class="pt-2 pb-0 text-caption text-grey-lighten-2 pl-3">
                        {{ item.subtitle }}
                    </v-card-subtitle>

                    <v-card-actions class="pt-0" style="min-height: 40px;">
                        <v-btn :href="item.url" target="_blank" size="small" variant="text" color="blue-lighten-2" :text="item.go" prepend-icon="mdi-rocket-launch-outline"></v-btn>
                        <v-spacer></v-spacer>
                        <v-btn
                            :icon="item.show ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                            size="small"
                            variant="text"
                            color="grey-lighten-1"
                            @click="item.show = !item.show;projectcardsShow(key);"
                        ></v-btn>
                    </v-card-actions>
                    
                    <v-expand-transition>
                        <div v-show="item.show">
                        <v-divider class="border-opacity-25"></v-divider>
                        <v-card-text class="text-caption text-grey-lighten-1 py-2">
                            {{item.text}}
                        </v-card-text>
                        </div>
                    </v-expand-transition>
                </v-card>
            </v-col>
        </v-row>
    </div>
      
  </div>
</template>

<script>
import typewriter from '../components/typewriter.vue';
import turntable from '../components/turntable.vue';
import { useDisplay } from 'vuetify'

export default {
    components: {
        typewriter,turntable
    },
    props: ['configdata','formattedTime','formattedDate','projectcards'],
	data() {
		return {
			searchQuery: '',
			selectedEngine: { title: 'Bing', value: 'bing' },
      		searchEngines :[
				{ title: 'Bing', value: 'bing' },
				{ title: 'Google', value: 'google' },
				{ title: '百度', value: 'baidu' },
			]
		}
	},
    setup() {
      const { xs,sm,md } = useDisplay();
      return {xs,sm,md};
    },
	computed: {	
		isUrl(){
			const str = this.searchQuery.trim();
  			return this.isLikelyUrl(str);
		}
	},
    methods:{
      projectcardsShow(key){
        for(let i = 0;i < this.projectcards.length;i++){
          if(i != key){
            this.projectcards[i].show = false;
          }
        }
      },
	  performSearch() {
		const query = this.searchQuery.trim();
		if (!query) return;

		if (this.isUrl) {
			let url = query;
			// 自动补全协议（如果缺少）
			if (!/^[a-z]+:\/\//i.test(url)) {
				url = 'http://' + url; // 默认用http
			}
			
			window.open(url, '_blank');
		} else {
			const engineUrls = {
				google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
				bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
				baidu: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
			};
			window.open(engineUrls[this.selectedEngine.value], '_blank');
		}
	  },
	  isLikelyUrl(input) {
		// 移除首尾空格
		const str = input.trim();
		
		// 情况1：明确包含协议头（http/https/ftp等）
		if (/^(https?|ftp):\/\//i.test(str)) return true;
		
		// 情况2：符合域名格式（支持国际化域名）
		const domainPattern = /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;
		
		// 情况3：localhost或IP地址
		const localPattern = /^(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/.*)?$/i;
		
		
		return (
			domainPattern.test(str) || 
			localPattern.test(str)
		);
		}
    }
};
</script>

<style scoped>
@import url(/css/app.less);
@import url(/css/mobile.less);
.glass-list {
	background: transparent !important;
	backdrop-filter: blur(var(--lbc-blur));
	border-radius: 5%;
	color: var(--lbc-vcard-color);
	overflow: hidden;
}
.search-bar-glass :deep(.v-field) {
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}
.search-bar-glass :deep(input) {
    color: white !important;
}

/* 卡片悬浮特效 */
.project-card {
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.project-card:hover {
    transform: translateY(-5px);
    background: rgba(255, 255, 255, 0.2) !important;
    box-shadow: 0 10px 20px rgba(0,0,0,0.2) !important;
}
</style>