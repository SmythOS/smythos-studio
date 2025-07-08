# smyth-builder-ui

## Prepare a new release

### For staging, run:

```bash
npm run prepare:staging
```

Then commit the changes using version as the commit message and push them to the repository.

### For production, run:

```bash
npm run prepare:production
```

This will create a new commit and a git tag with the version number. You can push them to the repository.

## Deployment

### Staging

1. Go to 'Actions' tab
2. Select 'DEV:Cluster DEPLOY' workflow
3. Open 'Run workflow' dropdown on right
4. Select 'dev' branch
5. Click 'Run workflow'

Wait for the workflow to complete.

### Production

1. Go to 'Actions' tab
2. Select 'PROD:Cluster DEPLOY' workflow
3. Open 'Run workflow' dropdown on right
4. Select 'main' branch
5. Click 'Run workflow'

Wait for the workflow to complete.


## Rollbacks
In case the last deployment has some issues, you can rollback to the previous version.

### Staging

1. Go to 'Actions' tab
2. Select 'DEV:Cluster ROLLBACK' workflow
3. Open 'Run workflow' dropdown on right
4. Select 'dev' branch
5. Click 'Run workflow'

Wait for the workflow to complete.

### Production

1. Go to 'Actions' tab
2. Select 'PROD:Cluster ROLLBACK' workflow
3. Open 'Run workflow' dropdown on right
4. Select 'main' branch
5. Click 'Run workflow'

Wait for the workflow to complete.
