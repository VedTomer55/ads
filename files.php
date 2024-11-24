<?php
// List of folder paths
$folders = [
    "images/Mobiqwick",
    "images/music_creatives",
    "images/trainman-creatives"
];

foreach ($folders as $folder) {
    // Check if the folder exists
    if (is_dir($folder)) {
        echo "Files in folder: $folder\n";
        // Get all files in the folder
        $files = scandir($folder);

        foreach ($files as $file) {
            // Skip current and parent directory pointers
            if ($file !== '.' && $file !== '..') {
                echo $file . "<br>";
            }
        }
        echo "\n"; // Add a blank line after each folder's list
    } else {
        echo "Folder $folder does not exist.\n";
    }
}
?>
