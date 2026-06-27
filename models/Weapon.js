const mongoose = require('mongoose');

// 데이터베이스에 저장될 스플래툰 무기 데이터의 규칙(틀)을 정의합니다.
const weaponSchema = new mongoose.Schema({
    key: { type: String, required: true },
    category: { type: String, required: true },      // 무기 종류 (슈터, 롤러 등)

    mainWeapon: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'mainWeapon' // 👈 'SubWeapon' 모델과 연결하겠다는 선언
    },
    subWeapon: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'SubWeapon' // 👈 'SubWeapon' 모델과 연결하겠다는 선언
    },
    specialWeapon: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'SpecialWeapon' // 👈 'SpecialWeapon' 모델과 연결하겠다는 선언
    }

    matching_range: { type: Number, required: true },
});

// 외부 파일(service 등)에서 이 틀을 사용할 수 있도록 내보냅니다.
module.exports = mongoose.model('Weapon', weaponSchema);
