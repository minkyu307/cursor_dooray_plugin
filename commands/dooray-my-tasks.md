---
name: dooray-my-tasks
description: 내가 담당 중인 두레이 업무 목록을 조회한다
---

# 내 두레이 업무

1. `dooray_get_me`로 내 organizationMemberId를 구한다.
2. `dooray_list_projects`를 `member=me`, `state=active`로 호출한다. 대상 프로젝트가 분명하지 않으면 사용자에게 프로젝트를 고르게 한다.
3. 선택한 프로젝트에서 `dooray_list_posts`를 호출한다.
   - `toMemberIds` = 내 멤버 ID
   - `postWorkflowClasses` = `registered,working` (완료 제외)
   - `order` = `postDueAt`
4. 제목, 업무번호, 상태, 만기일, 마일스톤을 표로 요약한다.
