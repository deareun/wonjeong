const App = {
    allArtworks: [],

    async init() {
        await this.fetchData();
        this.createFilterMenus(); // 필터 메뉴 자동 생성
        this.handleRouting();
        window.addEventListener('hashchange', () => this.handleRouting());
    },

    async fetchData() {
        const pubKey = "2PACX-1vRSEzwAv82QQ3t90wx7jaaI4_ujdxXLR5AyUkvuQonCJ_Yn21I6V614Ao9PYDRai9Pt3OYXm9Pn-2J5";
        const url = `https://docs.google.com/spreadsheets/d/e/${pubKey}/pub?output=csv`;
        
        try {
            const response = await fetch(url);
            const csvText = await response.text();
            this.allArtworks = this.parseCSV(csvText);
        } catch (e) { console.error("Data Load Error", e); }
    },

    parseCSV(csv) {
        const lines = csv.split(/\r?\n/);
        const data = [];
        for (let i = 2; i < lines.length; i++) {
            const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (!row || row.length < 3) continue;
            const clean = row.map(c => c.replace(/^"|"$/g, '').trim());
            const art = {
                id: clean[0], title: clean[2], size: clean[3],
                material: clean[4], year: clean[5], genre: clean[6],
                series: clean[7] || '기타',
                image: this.convertDriveLink(clean[1])
            };
            if (art.title && art.image) data.push(art);
        }
        return data;
    },

    convertDriveLink(url) {
        const id = url.match(/[-\w]{25,}/);
        return id ? `https://drive.google.com/thumbnail?id=${id[0]}&sz=w1000` : '';
    },

    // 시트 데이터를 읽어서 드롭다운 메뉴를 자동으로 만듭니다
    createFilterMenus() {
        const categories = {
            year: [...new Set(this.allArtworks.map(a => a.year))].sort().reverse(),
            subject: [...new Set(this.allArtworks.map(a => a.series))].sort(),
            genre: [...new Set(this.allArtworks.map(a => a.genre))].sort()
        };

        for (const [key, list] of Object.entries(categories)) {
            const menu = document.getElementById(`filter-${key}`);
            list.forEach(val => {
                if(!val) return;
                const li = document.createElement('li');
                li.innerHTML = `<a href="#/archive/${key}?val=${encodeURIComponent(val)}">${val}</a>`;
                menu.appendChild(li);
            });
        }
    },

    handleRouting() {
        const hash = window.location.hash || '#/';
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));

        if (hash.startsWith('#/archive/')) {
            const urlObj = new URL(window.location.origin + window.location.pathname + window.location.hash.replace('#', ''));
            const type = hash.split('/')[2].split('?')[0];
            const filterVal = new URLSearchParams(window.location.hash.split('?')[1]).get('val');
            
            this.renderArchive(type, filterVal);
            document.getElementById('page-archive').classList.add('active');
        } else {
            document.getElementById('page-home').classList.add('active');
        }
    },

    renderArchive(type, filterVal) {
        const container = document.getElementById('page-archive');
        container.innerHTML = '';

        const groupKey = type === 'year' ? 'year' : (type === 'subject' ? 'series' : 'genre');
        
        // 필터링 로직
        let filtered = (filterVal === 'all' || !filterVal) 
            ? this.allArtworks 
            : this.allArtworks.filter(art => String(art[groupKey]) === filterVal);

        // 그룹화하여 보여주기
        const groups = {};
        filtered.forEach(art => {
            const key = art[groupKey] || '기타';
            if (!groups[key]) groups[key] = [];
            groups[key].push(art);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        
        if(sortedKeys.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:100px;">해당 조건의 작품이 없습니다.</p>';
            return;
        }

        sortedKeys.forEach(key => {
            const section = document.createElement('div');
            section.className = 'archive-section';
            section.innerHTML = `
                <h2 class="section-heading">${key}</h2>
                <div class="artwork-grid">
                    ${groups[key].map(art => `
                        <div class="artwork-card">
                            <img src="${art.image}" alt="${art.title}" loading="lazy">
                            <div class="info">
                                <h3>${art.title}</h3>
                                <p>${art.material} / ${art.size} / ${art.year}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(section);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
