# Git notes

My own reference. Each entry: what it does, then when I actually used it.

---

## Orientation — when I'm lost

Run these four in order. Answers "where am I and what's going on."

```bash
pwd                 # which directory
git status          # which branch, what's changed, am I ahead of remote
git log --oneline   # what commits exist here
git branch          # what other branches exist
```

**When I used it:**


---

## Everyday loop

### `git status`
Branch, staged/unstaged changes, remote sync state. Suggests the next command in its output — read it.

**When I used it:**


### `git diff`
Shows unstaged changes line by line. `git diff --staged` for what's already staged.
Read this *before* committing, especially when a model wrote part of it.

**When I used it:**


### `git add -A`
Stages everything including new and deleted files.

**When I used it:**


### `git commit -m "message"`
Records the staged snapshot.

**When I used it:**


### `git push`
Sends commits to the remote.

**When I used it:**


---

## Branches

A branch is a label pointing at a commit. Checking out changes which version of the files I see.

### `git branch`
Lists branches. `*` marks current.

**When I used it:**
Claude created a separate branch, worktree-env-check-cli, and checked it out into its own directory so the work stayed isolated from main.

### `git checkout -b <name>`
Create a branch and switch to it.

**When I used it:**


### `git checkout <name>`
Switch to an existing branch.

**When I used it:**
git checkout worktree-env-check-cli, when i was searching new files, thats how I used the command to open them
git checkout main was used before merging the code, to get back into main branch and merge in correct place 

### `git merge <name>`
Brings that branch's commits into wherever I'm standing.
Direction matters: stand on the branch that should *receive*.

**When I used it:**
git merge worktree-env-check-cli was used after switching to main to merge the changes 

### `git branch -d <name>`
Deletes the label. Refuses if unmerged — that refusal is a safety net.
`-D` forces it. That's how people lose work.

**When I used it:**
git branch -d worktree-env-check-cli used to remove this branch


---

## Worktrees

Two folders, two branches, one history. The folder I'm in decides which branch's files I see.

### `git worktree list`
Every worktree with its path and branch. Path on the left is what `remove` takes.

**When I used it:**
Used to check whether the worktree directory is still sitting around

### `git worktree remove <path>`
Deletes the directory. Takes a *path*, not a branch name — different kind of thing.
Won't break a lock held by a running process.

**When I used it:**
git worktree remove .claude/worktrees/env-check-cli --force used when removing branch after merging the code 

### `git worktree prune`
Clears records for worktrees whose directory was deleted manually.

**When I used it:**


---

## Undo / fix

### `git rm -r --cached .`
Unstages everything, leaves files on disk. Re-add after fixing `.gitignore`.
Without `--cached` it deletes for real.

**When I used it:**


### `git commit --amend -m "message"`
Rewrites the last commit instead of stacking a new one.
Only safe before pushing.

**When I used it:**


### `git restore --staged <file>`
Unstage one file.

**When I used it:**


### `git checkout -- <file>`
Throw away unstaged changes to a file. Destructive, no undo.

**When I used it:**


---

## Remotes

### `git remote -v`
Lists configured remotes. Empty means nothing has been pushed anywhere.

**When I used it:**


### `gh repo create <name> --public --source=. --remote=origin --push`
Creates the GitHub repo and pushes, in one go.

**When I used it:**


---

## Inspecting

### `git show`
Full diff of the last commit. `--stat` for just the file list.

**When I used it:**


### `git ls-files`
Everything git is currently tracking. The command that answers "did node_modules sneak in."

**When I used it:**


### `git check-ignore -v <path>`
Says whether a path is ignored and which rule did it.
Empty output = not ignored.

**When I used it:**


---

## Things that bit me


---

## Learned later