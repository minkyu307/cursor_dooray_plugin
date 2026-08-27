---
name: dooray-task
description: 두레이 업무(포스트)를 조회, 생성, 상태 변경, 댓글 처리할 때 사용한다. 내 할 일, 버그 티켓, 완료 처리 요청에 적용한다.
---

# 두레이 업무 워크플로

1. `dooray_list_projects`로 project-id를 구한다. 기본 필터는 `member=me`, `state=active`.
2. 내 업무는 `dooray_get_me`의 id를 `toMemberIds`에 넣어 `dooray_list_posts`를 호출한다.
3. 진행 중만 보려면 `postWorkflowClasses=working` (또는 `registered,working`).
4. 상세는 `dooray_get_post`. 댓글은 `dooray_list_comments` / `dooray_add_comment`.
5. 상태 변경은 먼저 `dooray_list_workflows`로 workflowId를 찾고 `dooray_set_post_workflow`를 쓴다. 완료만 필요하면 `dooray_set_post_done`.
6. 새 업무는 담당자 이름이 있으면 멤버 검색 후 `toMemberIds`에 organizationMemberId를 넣는다.

목록 정렬 예: `order=-createdAt`, `order=postDueAt`.
만기 필터 예: `dueAt=today`, `dueAt=thisweek`, `dueAt=next-7d`.
