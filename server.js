const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// 서울시 공중화장실 API 프록시
app.get('/api/toilets', async (req, res) => {
  try {
    const KEY = process.env.SEOUL_API_KEY;
    const START = req.query.start || 1;
    const END = req.query.end || 1000;

    const url = `http://openapi.seoul.go.kr:8088/${KEY}/json/mgisToiletPoi/${START}/${END}/`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.mgisToiletPoi) {
      return res.status(500).json({ error: '데이터를 불러올 수 없어요', raw: data });
    }

    const toilets = data.mgisToiletPoi.row.map(t => ({
      id: t.OBJECTID,
      name: t.CONTS_NAME,
      address: t.ADDR_NEW || t.ADDR_OLD,
      lat: parseFloat(t.COORD_Y),   // 위도
      lng: parseFloat(t.COORD_X),   // 경도
      gu: t.GU_NAME,
      tel: t.TEL_NO || '',
      open: t.VALUE_02?.replace(/\|/g, ' ').trim() || '정보 없음',
      openDays: t.VALUE_01?.replace(/\|/g, ' ').trim() || '',
      closedDays: t.VALUE_03?.replace(/\|/g, ' ').trim() || '',
      male: t.VALUE_04?.includes('남자') || false,
      female: t.VALUE_04?.includes('여자') || false,
      disabled: t.VALUE_05?.includes('남자') || t.VALUE_05?.includes('여자') || false,
      safety: t.VALUE_07?.replace(/\|/g, ' ').trim() || '',
      type: t.VALUE_08?.replace(/\|/g, ' ').trim() || '',
    })).filter(t => t.lat && t.lng && !t.name.includes('삭제'));
    res.json({ total: data.mgisToiletPoi.list_total_count, toilets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ HappyToilet 서버 실행 중: http://localhost:${PORT}`);
});