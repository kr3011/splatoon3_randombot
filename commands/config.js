const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GuildSetting, Weapon } = require('../models');
const { generateConfigMenuRows } = require('../services/configdropdown'); // 💡 1단계 분리형 서비스 임포트

module.exports = {
  isGlobal: true,
  
  // 💡 명령어 빌더 부분에 'menu'와 'status' 인수를 가볍게 이식합니다.
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('このサーバーのブキチ杯に使用する武器リストの設定を管理できます。')
    .addSubcommand(subcommand =>
      subcommand.setName('menu').setDescription('ブキチ杯から除外する武器リストの選択します。')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('status').setDescription('このサーバーの武器リストの設定を確認します。')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('reset').setDescription('選択している除外武器リストを初期化(削除)します。')
    ),

  async execute(interaction) {
    // 유저가 어떤 인수를 선택해서 쳤는지 감지 (menu 혹은 status)
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    try {
      // =================================================================
      // 📝 시나리오 A: 유저가 [/config status] 를 입력했을 때 (밴 명단 출력)
      // =================================================================
      if (subcommand === 'status') {
        // 모든 멤버들이 같이 보고 소통해야 하므로 ephemeral을 걸지 않고 전체 공유 답변을 띄웁니다.
        await interaction.deferReply();

        // 이 서버의 밴 설정을 가져오면서 외래키인 Weapon 방과 그 안의 이름 방(mainWeapon)까지 일제히 결합
        const setting = await GuildSetting.findOne({ guildId });

        if (!setting || !setting.bannedWeapons || setting.bannedWeapons.length === 0) {
          return await interaction.editReply('🕊️ **除外されている武器がありません。**\nすべての武器が登場します。');
        }

        // 2. 💡 [오류 수정 부] 스키마 구조상 populate가 안 되므로, Weapon 컬렉션에서 실제 무기 정보들을 직접 조회합니다.
        const bannedKeys = setting.bannedWeapons;
        const weaponsData = await Weapon.find({ key: { $in: bannedKeys } }).populate('mainWeapon');

        // DB 순서가 꼬이지 않도록 유저가 밴한 순서(또는 저장된 순서)대로 정렬하여 텍스트 조립
        const banListText = bannedKeys.slice(0, 20).map((key, index) => {
          const w = weaponsData.find(item => item.key === key);
          
          if (!w) return `${index + 1}. 🚫 **${key}** (데이터 없음)`;

          const nameJa = w.mainWeapon?.name_ja || w.name_ja || w.key;
          const nameKr = w.mainWeapon?.name_kr || w.name_kr ? `(${w.mainWeapon?.name_kr || w.name_kr})` : '';
          return `${index + 1}. 🚫 **${nameJa}** ${nameKr}`;
        }).join('\n');

        const text = setting.bannedWeapons.length > 20? banListText + '\n...' : banListText;

        // 빨간색 밴 현황 전용 명찰 임베드 작성
        const statusEmbed = new EmbedBuilder()
          .setColor('#FF003C')
          .setTitle('除外された武器リスト')
          .setDescription(`このサーバーでは、下記の **${setting.bannedWeapons.length}個** の武器は \`/bukichi\` ブキチ杯から除外されます。`)
          .addFields({ name: '', value: text })
          .setTimestamp();

        return await interaction.editReply({ embeds: [statusEmbed] });
      }

      // =================================================================
      // ⚙️ 시나리오 B: 유저가 원래대로 [/config menu] 를 입력했을 때 (체크박스 폼)
      // =================================================================
      if (subcommand === 'menu') {
        await interaction.deferReply({ ephemeral: true });

        // 💡 분리해둔 1단계 서비스를 실행해 깨끗하게 연산된 드롭다운 ActionRow 객체들을 배달 받습니다!
        const { firstRows, secondRows } = await generateConfigMenuRows(guildId);

        await interaction.editReply({
          content: '⚙️ **ブキチ杯の武器リスト設定 [1/2]**\nこのサーバーでブキチ杯に **含まない(除外する)武器**を選択してください。\n(選択された武器はブキチ杯から除外されます。)',
          components: firstRows
        });

        await interaction.followUp({
          content: '⚙️ **ブキチ杯の武器リスト設定 [2/2]**\nこのサーバーでブキチ杯に **含まない(除外する)武器**を選択してください。\n(選択された武器はブキチ杯から除外されます。)',
          components: secondRows,
          ephemeral: true
        });
      }

      // =================================================================
      // 🔄 시나리오 C: 유저가 [/config reset] 을 입력했을 때 (제외 명단 초기화)
      // =================================================================
      if (subcommand === 'reset') {
        await interaction.deferReply();

        // 스키마 구조에 맞게 String 배열을 빈 배열([])로 초기화합니다.
        await GuildSetting.findOneAndUpdate(
          { guildId },
          { $set: { bannedWeapons: [] } },
          { new: true, upsert: true }
        );

        const resetEmbed = new EmbedBuilder()
          .setColor('#00FF66')
          .setTitle('⚙️ 除外リストの初期化完了')
          .setDescription('このサーバーのブキチ杯除外武器リストが**すべて初期化**されました。\nこれからはすべての武器が抽選に登場します。')
          .setTimestamp();

        return await interaction.editReply({ embeds: [resetEmbed] });
      }


    } catch (error) {
      console.error('❌ config 가동 중 치명적 에러 감지:', error);

      // 서비스단에서 터트린 유령/공석 카테고리 예외처리 수신
      if (error.message === 'DATABASE_EMPTY_WEAPONS') {
        return await interaction.editReply('❌ DBにデータが存在しません。 `/fetch` を実行し、データを更新してください。');
      }
      if (error.message.startsWith('EMPTY_CATEGORY_')) {
        const failedPart = error.message.replace('EMPTY_CATEGORY_', '');
        return await interaction.editReply(`❌ **メッセージ生成失敗**: **[${failedPart}]**に含まれる武器が存在しないため、フォームの生成が中断されました。 \`/fetch\` を実行し、データを更新してください。`);
      }

      await interaction.editReply('❌ 武器の選択メッセージの作成に失敗しました。');
    }
  },
};
