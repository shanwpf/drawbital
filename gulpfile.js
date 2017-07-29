var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('uglify-es');
var composer = require('gulp-uglify/composer')
var minify = composer(uglify, console);

var clientjs = ['src/draw.js', 'src/chat.js' ,'src/signin.js', 'src/lobby.js',
                'src/game.js', 'src/drawbital.js'];

gulp.task('build', () => {
    return gulp.src(clientjs)
        .pipe(concat('drawbital-compiled.js'))
        .pipe(gulp.dest('client/js'))
        .pipe(minify())
        .pipe(gulp.dest('client/js'));
});

gulp.task('compress', () => {
    return gulp.src('src/app.js')
        .pipe(minify())
        .pipe(gulp.dest('.'))
})

gulp.task('default', ['build', 'compress']);