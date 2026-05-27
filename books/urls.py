from django.urls import path

from . import views

app_name = "books"

urlpatterns = [
    # Pages
    path("", views.home, name="home"),
    path("shelves/", views.shelves, name="shelves"),
    path("discover/", views.discover, name="discover"),
    path("challenge/", views.challenge_page, name="challenge"),
    path("stats/", views.stats, name="stats"),
    path("feed/", views.feed, name="feed"),
    path("friends/", views.friends, name="friends"),
    path("notifications/", views.notifications, name="notifications"),
    path("profile/", views.profile, name="profile"),
    path("profile/<str:username>/", views.profile, name="profile_user"),
    path("search/", views.search, name="search"),

    # Book actions
    path("api/book/<int:book_id>/", views.book_detail, name="book_detail"),
    path("api/book/<int:book_id>/save/", views.save_book, name="save_book"),
    path("api/book/import/", views.import_book, name="import_book"),

    # Shelf / progress
    path("api/userbook/<int:ub_id>/remove/", views.remove_from_shelf, name="remove_from_shelf"),
    path("api/userbook/<int:ub_id>/progress/", views.update_progress, name="update_progress"),

    # Challenge / notifications
    path("api/challenge/goal/", views.set_goal, name="set_goal"),
    path("api/notification/<int:notif_id>/read/", views.mark_notif_read, name="mark_notif_read"),

    # Friend requests
    path("api/user/<int:user_id>/friend-request/", views.send_friend_request, name="send_friend_request"),
    path("api/friend-request/<int:req_id>/respond/", views.respond_friend_request, name="respond_friend_request"),
    path("api/user/<int:user_id>/unfriend/", views.unfriend, name="unfriend"),
    # Legacy follow URL kept as alias for the existing JS:
    path("api/user/<int:user_id>/follow/", views.send_friend_request, name="toggle_follow"),

    # Moderation
    path("api/report/", views.report_content, name="report_content"),
]
