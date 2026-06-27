const mongoose = require('mongoose');

// 데이터베이스에 저장될 스플래툰 무기 데이터의 규칙(틀)을 정의합니다.
const weaponSchema = new mongoose.Schema({
  name: { type: String, required: true },          // 무기 한국어 이름
  category: { type: String, required: true },      // 무기 종류 (슈터, 롤러 등)
  subWeapon: { type: String, default: '없음' },     // 서브 웨폰
  specialWeapon: { type: String, default: '없음' }, // 스페셜 웨폰
  levelRequired: { type: Number, default: 1 }      // 해금 레벨
});

// 외부 파일(service 등)에서 이 틀을 사용할 수 있도록 내보냅니다.
module.exports = mongoose.model('Weapon', weaponSchema);
