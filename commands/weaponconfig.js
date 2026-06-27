const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Weapon, MainWeapon, GuildSetting } = require('../models');

module.exports = {
  isGlobal: true, // 모든 일반 서버에 배포하므로 true
  
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('이 서버의 랜덤 매칭 무기 풀을 카테고리별로 설정합니다.'),

  async execute(interaction) {
    // 설정 화면은 개인 눈에만 조용히 보이도록 ephemeral 처리
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guildId;

    try {
      // 1. MongoDB에서 전체 무기 목록을 긁어옵니다.
      const allWeapons = await Weapon.find({}).populate('mainweapons');
      
      // 2. 이 서버의 기존 허용 무기 설정 풀을 가져옵니다 (체크박스 활성화용)
      const setting = await GuildSetting.findOne({ guildId });
      const allowedIds = setting ? setting.allowedWeapons.map(id => id.toString()) : [];

      // 3. 무기들을 카테고리별로 분류하기 위한 바구니 생성
      const shooters = allWeapons.filter(w => w.category === 'shooter');
      const blasters = allWeapons.filter(w => w.category === 'blaster');
      const rollers = allWeapons.filter(w => w.category === 'roller');
      const chargers = allWeapons.filter(w => w.category === 'charger');

      // 4. [공정 A] 슈터 전용 드롭다운 메뉴 조립 (최대 25개 제한 안전지대)
      const shooterMenu = new StringSelectMenuBuilder()
        .setCustomId('config_shooters')
        .setPlaceholder('🔫 슈터 종류 선택 (복수 선택 가능)')
        .setMinValues(0) // 아무것도 선택 안 함 허용
        .setMaxValues(Math.min(shooters.length, 25)); // 가용 개수만큼 체크박스 활성화 [1, 2]

      shooters.forEach(w => {
        shooterMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(w.mainWeapon?.name_ja)
            .setValue(w._id.toString())
            .setDefault(allowedIds.includes(w._id.toString())) // 💡 기존에 이미 등록된 무기라면 자동으로 체크 표시!
        );
      });

      // 5. [공정 B] 롤러 전용 드롭다운 메뉴 조립
      const rollerMenu = new StringSelectMenuBuilder()
        .setCustomId('config_rollers')
        .setPlaceholder('🧹 롤러 종류 선택 (복수 선택 가능)')
        .setMinValues(0)
        .setMaxValues(Math.min(rollers.length, 25));

      rollers.forEach(w => {
        rollerMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(w.mainWeapon.name_kr)
            .setValue(w._id.toString())
            .setDefault(allowedIds.includes(w._id.toString()))
        );
      });

      // 6. [공정 C] 차저 전용 드롭다운 메뉴 조립
      const chargerMenu = new StringSelectMenuBuilder()
        .setCustomId('config_chargers')
        .setPlaceholder('🎯 차저 종류 선택 (복수 선택 가능)')
        .setMinValues(0)
        .setMaxValues(Math.min(chargers.length, 25));

      chargers.forEach(w => {
        chargerMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(w.name_kr)
            .setValue(w._id.toString())
            .setDefault(allowedIds.includes(w._id.toString()))
        );
      });

      // 디스코드 규칙상 메뉴 1개당 1개의 ActionRow에 담아야 하므로 분리 결합합니다.
      const row1 = new ActionRowBuilder().addComponents(shooterMenu);
      const row2 = new ActionRowBuilder().addComponents(rollerMenu);
      const row3 = new ActionRowBuilder().addComponents(chargerMenu);

      // 7. 최종 3세트 드롭다운 폼 화면에 전송
      await interaction.editReply({
        content: '⚙️ **서버 랜덤 매칭 무기 설정**\n각 카테고리별 메뉴를 열어 매칭에 포함할 무기들을 체크박스처럼 선택해 주세요!\n(선택을 바꾸면 서버 설정에 즉시 반영됩니다.)',
        components: [row1, row2, row3]
      });

    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ 무기 설정 메뉴를 불러오는 도중 에러가 발생했습니다.');
    }
  },
};
