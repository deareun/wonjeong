const App = {
    allArtworks: [],

    async init() {
        console.log("앱 초기화 시작...");
        await this.fetchData();
        this.handleRouting();
        this.bindEvents();
    },

async fetchData() {
    const sheetId = CONFIG.SHEET_ID;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv`;
    try {
        const response = await fetch(url);
            if (!response.ok) throw new Error("시트 응답 에러");
            const csvText = await response.text();
            console.log("원본 데이터 수신 성공");
            this.allArtworks = this.parseCSV(csvText);
            console.log("파싱된 데이터:", this.allArtworks);
        } catch (error) {
            console.error("데이터 로드 실패:", error);
            alert("데이터를 불러오지 못했습니다. 시트 공유 설정을 확인해주세요.");
        }
    },

    parseCSV(csv) {
        // CSV의 각 행을 분리 (따옴표 안의 쉼표 무시 로직)
        const lines = csv.split(/\r?\n/);
        if (lines.length < 3) return [];

        const data = [];
        // 0번: 헤더, 1번: Filter행 -> 따라서 2번 인덱스(3행)부터 실제 데이터
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

            // 이미지 주소 변환
            artwork.image = this.convertDriveLink(artwork.rawUrl);
            
            // 작품명이 있는 데이터만 추가
            if (artwork.title) data.push(artwork);
        }
        return data;
    },

    convertDriveLink(url) {
        if (!url) return '';
        // 이미 변환된 형태(googleusercontent)라면 그대로 반환
        if (url.includes('googleusercontent.com')) return url;
        
        let id = '';
        if (url.includes('id=')) {
            id = url.split('id=')[1].split('&')[0];
        } else if (url.includes('/file/d/')) {
            id = url.split('/file/d/')[1].split('/')[0];
        }

        // 구글 드라이브 썸네일 API 사용 (가장 안정적임)
        return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : '';
    },

    handleRouting() {
        const hash = window.location.hash || '#/';
        const container = document.getElementById('page-archive');
        const home = document.getElementById('page-home');
        
        // 모든 페이지 숨기기
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));

        if (hash.startsWith('#/archive/')) {
            const type = hash.split('/').pop(); // year, exhibition, subject
            this.renderArchive(type);
            container.classList.add('active');
        } else if (hash === '#/') {
            home.classList.add('active');
        } else {
            const otherPage = document.getElementById(`page-${hash.replace('#/', '')}`);
            if (otherPage) otherPage.classList.add('active');
        }
    },

    renderArchive(type) {
        const container = document.getElementById('page-archive');
        container.innerHTML = '';

        if (this.allArtworks.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:50px;">데이터를 불러오는 중이거나 표시할 내용이 없습니다.</p>';
            return;
        }

        // 그룹화 기준
        const groupKey = type === 'year' ? 'year' : (type === 'subject' ? 'series' : 'genre');
        const groups = {};

        this.allArtworks.forEach(art => {
            const val = art[groupKey] || '미분류';
            if (!groups[val]) groups[val] = [];
            groups[val].push(art);
        });

        // 정렬 및 렌더링
        Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(key => {
            const section = document.createElement('div');
            section.className = 'archive-section';
            section.innerHTML = `
                <h2 class="section-heading">${key}</h2>
                <div class="artwork-grid">
                    ${groups[key].map(art => `
                        <div class="artwork-card">
                            <img src="${art.image}" alt="${art.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/400?text=Image+Not+Found'">
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