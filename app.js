const App = {
    allArtworks: [],

    async init() {
        console.log("앱 초기화 중...");
        await this.fetchData();
        this.handleRouting();
        this.bindEvents();
    },

async fetchData() {
        // '웹에 게시' 시 생성된 고유 키를 사용하여 CSV 경로를 만듭니다.
        // 주소에서 2PACX-... 부분을 추출하여 사용합니다.
        const pubKey = "2PACX-1vRSEzwAv82QQ3t90wx7jaaI4_ujdxXLR5AyUkvuQonCJ_Yn21I6V614Ao9PYDRai9Pt3OYXm9Pn-2J5";
        const url = `https://docs.google.com/spreadsheets/d/e/${pubKey}/pub?output=csv`;
        
        try {
            console.log("데이터 요청 중...");
            const response = await fetch(url);
            if (!response.ok) throw new Error("네트워크 응답 에러");
            
            const csvText = await response.text();
            
            // 데이터가 비어있거나 오류 페이지인지 확인
            if (csvText.length < 100) {
                throw new Error("데이터가 너무 적거나 형식이 올바르지 않습니다.");
            }

            this.allArtworks = this.parseCSV(csvText);
            console.log("로드된 작품 수:", this.allArtworks.length);
            
            // 데이터 로드 후 현재 페이지 렌더링
            this.handleRouting(); 
            
        } catch (error) {
            console.error("데이터 로드 실패:", error);
            const container = document.getElementById('page-archive');
            if (container) {
                container.innerHTML = `<p style="padding:50px; text-align:center;">데이터를 불러오는 데 실패했습니다: ${error.message}</p>`;
            }
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
