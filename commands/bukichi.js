// commands/ping.js
module.exports = {
    name: 'bukichi', // 사용자가 입력할 명령어 
    description: '봇이 응답 메시지를 보냅니다.',
    execute(message, args) {
        // 채널에 "퐁! 정상 작동 중입니다."라는 메시지를 보냅니다.
        message.channel.send('🏓 퐁! 정상 작동 중입니다.');
    },
};
