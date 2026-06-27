const mongoose = require('mongoose');

// 데이터베이스에 저장될 스플래툰 무기 데이터의 규칙(틀)을 정의합니다.
const nameSchema = new mongoose.Schema({
    // key: { type: String, required: true },
    name_ja: { type: String, required: true },
    name_kr: { type: String, default: null },
});

// 외부 파일(service 등)에서 이 틀을 사용할 수 있도록 내보냅니다.
module.exports = mongoose.model('MainWeapon', nameSchema);