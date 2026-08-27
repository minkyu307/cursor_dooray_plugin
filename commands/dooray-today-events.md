---
name: dooray-today-events
description: 오늘 두레이 캘린더 일정을 조회한다
---

# 오늘 일정

1. `dooray_list_calendars`로 캘린더 id를 구한다.
2. `dooray_list_events`를 호출한다.
   - `timeMin` = 오늘 00:00:00+09:00
   - `timeMax` = 내일 00:00:00+09:00
   - `calendars` = 조회할 캘린더 id 목록
3. 시작/종료, 제목, 장소, 캘린더 이름을 시간순으로 정리한다. 목록 응답에는 본문이 없다. 상세가 필요하면 `dooray_get_event`를 호출한다.
