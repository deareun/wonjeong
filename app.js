const App = {
    allArtworks: [],

    async init() {
        console.log("앱 초기화 중...");
        await this.fetchData();
        this.handleRouting();
        this.bindEvents();
    },

    async fetchData() {
        const sheetId = CONFIG.SHEET_ID;
        // 보안 에러를 피하기 위해 '웹에 게시(pub)'용 URL을 사용합니다.
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("데이터를 가져올 수 없습니다.");
            const csvText = await response.text();
            this.allArtworks = this.parseCSV(csvText);
            console.log("데이터 로드 완료:", this.allArtworks);
        } catch (error) {
            console.error("로드 실패:", error);
            // 에러 시 사용자에게 알림
            const container = document.getElementById('page-archive');
            if(container) container.innerHTML = `<p style="padding:50px; text-align:center;">데이터를 불러오는 중 오류가 발생했습니다. 구글 시트에서 [파일 > 공유 > 웹에 게시]를 완료했는지 확인해주세요.</p>`;
        }
    },

    parseCSV(csv) {
        // CSV 줄바꿈 및 쉼표 처리
        const lines = csv.split(/\r?\n/);
        if (lines.length < 3) return [];

        const data = [];
        // 3행(인덱스 2)부터 실제 데이터 시작
        for (let i = 2; i < lines.length; i++) {
            const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (!row || row.length < 3) continue;

            const cleanRow = row.map(cell => cell.replace(/^"|"$/g, '').trim());
            
            const artwork = {
                id: cleanRow[0],
                rawUrl: cleanRow[1],
                title: cleanRow[2],
                size: cleanRow[3],
                material: cleanRow[4],
                year: cleanRow[5],
                genre: cleanRow[6],
                series: cleanRow[7] || '기타'
            };

            artwork.image = this.convertDriveLink(artwork.rawUrl);
            if (artwork.title && artwork.image) data.push(artwork);
        }
        return data;
    },

    convertDriveLink(url) {
        if (!url) return '';
        let id = '';
        if (url.includes('id=')) {
            id = url.split('id=')[1].split('&')[0];
        } else if (url.includes('/file/d/')) {
            id = url.split('/file/d/')[1].split('/')[0];
        }
        // 구글 드라이브 이미지를 웹에서 바로 보여주는 썸네일 주소
        return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : '';
    },

    handleRouting() {
        const hash = window.location.hash || '#/';
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));

        if (hash.startsWith('#/archive/')) {
            const type = hash.split('/').pop();
            this.renderArchive(type);
            document.getElementById('page-archive').classList.add('active');
        } else if (hash === '#/') {
            document.getElementById('page-home').classList.add('active');
        } else {
            const pageId = `page-${hash.replace('#/', '')}`;
            const target = document.getElementById(pageId);
            if (target) target.classList.add('active');
        }
    },

    renderArchive(type) {
        const container = document.getElementById('page-archive');
        container.innerHTML = '';

        const groupKey = type === 'year' ? 'year' : (type === 'subject' ? 'series' : 'genre');
        const groups = {};

        this.allArtworks.forEach(art => {
            const val = art[groupKey] || '기타';
            if (!groups[val]) groups[val] = [];
            groups[val].push(art);
        });

        Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(key => {
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
    },

    bindEvents() {
        window.addEventListener('hashchange', () => this.handleRouting());
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
