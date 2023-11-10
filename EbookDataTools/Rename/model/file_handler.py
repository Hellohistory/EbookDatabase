import os


def get_files_from_directory(directory_path, recursive=False):
    file_list = []
    if recursive:
        for root, dirs, files in os.walk(directory_path):
            for file in files:
                file_list.append(os.path.join(root, file))
    else:
        file_list = [os.path.join(directory_path, file) for file in os.listdir(directory_path) if
                     os.path.isfile(os.path.join(directory_path, file))]

    return file_list

