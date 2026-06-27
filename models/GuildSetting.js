const mongoose = require('mongoose');

const guildSettingSchema = new mongoose.Schema({
  // 💡 디스코드 서버 고유 ID (이 값을 기준으로 서버를 구별합니다)
  guildId: { type: String, required: true, unique: true }, 
  
  // 💡 이 서버에서 매칭에 포함할 무기들의 ObjectId 외래키 배열
  // 아무것도 설정하지 않았다면 기본값으로 모든 무기를 사용하도록 빈 배열로 둡니다.
  allowedWeapons: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Weapon' 
  }]
}, { versionKey: false });

module.exports = mongoose.model('GuildSetting', guildSettingSchema);
