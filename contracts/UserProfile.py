# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass


@allow_storage
@dataclass
class Profile:
    username: str
    bio: str
    avatar_url: str
    twitter_handle: str
    created_at: u256
    updated_at: u256


class UserProfile(gl.Contract):
    profiles: TreeMap[str, Profile]
    username_to_address: TreeMap[str, str]
    profile_count: u256

    def __init__(self) -> None:
        self.profile_count = u256(0)

    @gl.public.write
    def create_profile(self, username: str, bio: str, avatar_url: str, twitter_handle: str) -> None:
        addr = str(gl.message.sender_address)
        assert self.profiles.get(addr) is None, "Profile already exists"
        assert len(username) >= 3, "Username too short"
        assert len(username) <= 30, "Username too long"
        assert self.username_to_address.get(username) is None, "Username taken"
        self.profiles[addr] = Profile(
            username=username,
            bio=bio,
            avatar_url=avatar_url,
            twitter_handle=twitter_handle,
            created_at=u256(0),
            updated_at=u256(0),
        )
        self.username_to_address[username] = addr
        self.profile_count = self.profile_count + u256(1)

    @gl.public.write
    def update_profile(self, bio: str, avatar_url: str, twitter_handle: str) -> None:
        addr = str(gl.message.sender_address)
        profile = self.profiles.get(addr)
        assert profile is not None, "No profile found"
        profile.bio = bio
        profile.avatar_url = avatar_url
        profile.twitter_handle = twitter_handle
        profile.updated_at = u256(1)
        self.profiles[addr] = profile

    @gl.public.view
    def get_profile(self, address: str) -> dict:
        p = self.profiles.get(address)
        if p is None:
            return {}
        return {
            "username": p.username,
            "bio": p.bio,
            "avatar_url": p.avatar_url,
            "twitter_handle": p.twitter_handle,
            "created_at": int(p.created_at),
            "updated_at": int(p.updated_at),
        }

    @gl.public.view
    def has_profile(self, address: str) -> bool:
        return self.profiles.get(address) is not None

    @gl.public.view
    def get_profile_count(self) -> int:
        return int(self.profile_count)
