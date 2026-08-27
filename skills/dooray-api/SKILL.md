---
name: dooray-api
description: 공식 Dooray 서비스 API로 멤버, 프로젝트, 업무, 캘린더, 메신저, 위키, 드라이브, 예약, 주소록을 다룰 때 사용한다. 두레이 조회/생성/수정 요청이면 이 스킬을 적용한다.
---

# Dooray 서비스 API

공식 가이드: [Dooray-가이드](https://helpdesk.dooray.com/share/pages/9wWo-xwiR66BO5LGshgVTg/2939987647631384419)

## 인증

- 발급: 두레이 개인설정 > API > 개인 인증 토큰
- 헤더: `Authorization: dooray-api {TOKEN}`
- 권한은 토큰 발급 계정과 동일하다.
- TLS 1.2 이상만 지원한다.

Base URL

| 환경 | URL |
| --- | --- |
| 민간 클라우드 | `https://api.dooray.com` |
| 공공 클라우드 | `https://api.gov-dooray.com` |
| 공공 업무망 | `https://api.gov-dooray.co.kr` |
| 금융 클라우드 | `https://api.dooray.co.kr` |

응답은 HTTP 상태와 `header.isSuccessful`, `header.resultCode`, `header.resultMessage`로 해석한다. `resultMessage`는 사람용 문자열이며 프로그램 분기에 쓰지 않는다.

## 작업 순서

1. `dooray_get_me`로 내 organizationMemberId를 확인한다.
2. 사람 이름 → `dooray_search_members`
3. 프로젝트 이름/코드 → `dooray_list_projects` (`member=me` 권장)
4. 상태 변경 전 `dooray_list_workflows`로 workflowId를 구한다.
5. 전용 도구가 없으면 `dooray_list_api_catalog` 후 `dooray_api_call`

## 자주 쓰는 필드

업무 생성 body 요지

- `users.to[].type = member`, `users.to[].member.organizationMemberId`
- `body.mimeType`: `text/x-markdown` 또는 `text/html`
- `dueDate`: ISO8601, `dueDateFlag: true`
- `priority`: `highest | high | normal | low | lowest | none`
- 목록 필터 `postWorkflowClasses`: `backlog,registered,working,closed`

멤버 검색: 공식 문서는 `externalEmailAddresses`를 필수로 안내한다. 이메일 없이 이름만 주면 400이 날 수 있으므로, 가능하면 이메일을 함께 넘긴다.

프로젝트 멤버 추가는 `organizationMemberId`와 `role` (`admin|member`)이다.

메신저 1:1은 `POST /messenger/v1/channels/direct-send` (`text`, `organizationMemberId`).

일정 목록은 경로가 반드시 `/calendar/v1/calendars/*/events`이고 `timeMin`/`timeMax`가 필수다. 경로의 `*` 자리에 calendar-id를 넣지 않는다.

## 안전

- 삭제류는 대상을 보여주고 `confirm=true`로 재호출한다.
- Rate limit 429이면 잠시 기다린다. 응답 헤더 `X-RateLimit-*`를 참고한다.
- 테넌트에서 서비스 API가 막혀 있으면 `403 AUTH_FORBIDDEN_ACL_SERVICE_ERROR`가 난다. 이 경우 토큰 문제가 아니다.
