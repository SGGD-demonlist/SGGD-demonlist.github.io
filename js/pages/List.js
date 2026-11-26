import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="pc-page">
            <div class="pc-tabs">
                <button :class="{ active: tab === 'main' && selected === null }" @click="selectTab('main')">Main List</button>
                <button :class="{ active: tab === 'extended' && selected === null }" @click="selectTab('extended')">Extended List</button>
                <button :class="{ active: tab === 'legacy' && selected === null }" @click="selectTab('legacy')">Legacy List</button>
            </div>

            <div class="pc-body">
                <div class="pc-main-col">
                    <div v-if="selected === null" class="pc-feed">
                        <div
                            v-for="item in filteredList"
                            :key="item.rank"
                            class="pc-big-card"
                            :class="{ error: !item.level }"
                            @click="item.level && (selected = item.rank - 1)"
                        >
                            <img
                                v-if="item.level && thumbnail(item.level.verification)"
                                :src="thumbnail(item.level.verification)"
                                class="pc-big-thumb"
                                alt="Thumbnail"
                            />
                            <div class="pc-big-info">
                                <h2>#{{ item.rank }} – {{ item.level?.name || \`Error (\${item.err}.json)\` }}</h2>
                                <p v-if="item.level" class="pc-pub">published by {{ item.level.author }}</p>
                                <p v-if="item.level && item.rank <= 150" class="pc-pts">
                                    {{ score(item.rank, item.level.percentToQualify, item.level.percentToQualify) }} ({{ item.level.percentToQualify }}%) — {{ score(item.rank, 100, item.level.percentToQualify) }} (100%) points
                                </p>
                                <p v-else-if="item.level" class="pc-pts">Legacy List (0 points)</p>
                            </div>
                        </div>
                        <p v-if="filteredList.length === 0" class="pc-empty">No levels in this section yet.</p>
                    </div>

                    <div v-else class="pc-detail-card">
                        <button class="pc-back-btn" @click="selected = null">← Back to List</button>
                        <div class="level" v-if="level">
                            <h1>#{{ selected + 1 }} – {{ level.name }}</h1>
                            <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                            <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                            <ul class="stats">
                                <li>
                                    <div class="type-title-sm">Points when completed</div>
                                    <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                                </li>
                                <li>
                                    <div class="type-title-sm">ID</div>
                                    <p>{{ level.id }}</p>
                                </li>
                                <li>
                                    <div class="type-title-sm">Password</div>
                                    <p>{{ level.password || 'Free to Copy' }}</p>
                                </li>
                            </ul>
                            <h2>Records</h2>
                            <p v-if="selected + 1 <= 75"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                            <p v-else-if="selected + 1 <= 150"><strong>100%</strong> or better to qualify</p>
                            <p v-else>This level does not accept new records.</p>
                            <table class="records">
                                <tr v-for="record in level.records" class="record">
                                    <td class="percent"><p>{{ record.percent }}%</p></td>
                                    <td class="user"><a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a></td>
                                    <td class="mobile"><img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile"></td>
                                    <td class="hz"><p>{{ record.hz }}Hz</p></td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <aside class="pc-sidebar">
                    <div class="pc-side-box" v-if="editors">
                        <h3>List Editors</h3>
                        <p class="pc-side-note">Contact any of these people if you have problems with the list or want to see a specific thing changed.</p>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </div>
                    <div class="pc-side-box">
                        <h3>Submission Requirements</h3>
                        <p>Achieved the record without using hacks (however, FPS bypass is allowed, up to 360fps)</p>
                        <p>Achieved the record on the level that is listed on the site - please check the level ID before you submit a record</p>
                        <p>Have either source audio or clicks/taps in the video. Edited audio only does not count</p>
                        <p>The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt.</p>
                        <p>The recording must also show the player hit the endwall, or the completion will be invalidated.</p>
                        <p>Do not use secret routes or bug routes</p>
                        <p>Do not use easy modes, only a record of the unmodified level qualifies</p>
                    </div>
                </aside>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: null,
        tab: "main",
        errors: [],
        roleIconMap,
        store
    }),
    computed: {
        filteredList() {
            return this.list
                .map(([level, err], i) => ({ level, err, rank: i + 1 }))
                .filter((item) => {
                    if (this.tab === "main") return item.rank <= 75;
                    if (this.tab === "extended") return item.rank > 75 && item.rank <= 150;
                    return item.rank > 150;
                });
        },
        level() {
            return this.selected !== null ? this.list.at(this.selected)?.at(0) : null;
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }
            return embed(this.toggledShowcase ? this.level.showcase : this.level.verification);
        },
    },
    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();
        this.loading = false;
    },
    methods: {
        embed,
        score,
        selectTab(t) {
            this.tab = t;
            this.selected = null;
        },
        thumbnail(url) {
            if (!url) return "";
            const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            const id = match ? match.at(1) : "";
            return id ? ["https:/", "img.you" + "tube." + "com", "vi", id, "mqdefault.jpg"].join("/") : "";
        },
    },
};
