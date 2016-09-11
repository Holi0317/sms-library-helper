'use strict';

let gulp = require('gulp');

gulp.task('copy:extras', () => {
  return gulp.src([
    'frontend/app/*.*',
    '!frontend/app/.eslintrc'
  ], {
    dot: true
  }).pipe(gulp.dest('frontend/static'));
});
