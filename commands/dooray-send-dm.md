---
name: dooray-send-dm
description: 두레이 멤버에게 1:1 메신저 메시지를 보낸다
---

# 두레이 1:1 메시지

1. 수신자 이름/이메일/userCode로 `dooray_search_members`를 호출한다.
2. 후보가 여러 명이면 목록을 보여주고 한 명을 고른다.
3. 메시지 본문을 확인한 뒤 `dooray_send_direct_message`로 전송한다.
4. 응답 log-id를 보고한다.
